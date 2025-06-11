import moment from 'moment';

export const getPairProjectsFromCsvFile = (string) => {
    // Avoid expensive operations if the input is empty
    if (!string) {
        return [];
    }

    // CSV conversion
    const csvHeaderCols = string.slice(0, string.indexOf("\n")).split(",");
    const csvRows = string.slice(string.indexOf("\n") + 1).split("\n").filter(row => row.trim() !== "");

    // Data processing. Focused on readability instead of performance because expected data size is small
    const records = getRecordsFromCSVData(csvHeaderCols, csvRows);
    const projects = getProjectsFromRecords(records);
    const uniqueEmployees = [...new Set(records.map(record => record.EmpID))];
    const timeWorkedInPairs = getTimeWorkedInPairs(uniqueEmployees, projects);
    const pairWorkedMostTogether = getPairWorkedMostTogether(timeWorkedInPairs);
    const resultPair = pairWorkedMostTogether.sort((a, b) => b.daysWorkedTogether - a.daysWorkedTogether)[0];
    const displayedProjects = getProjectsToDisplay(projects, resultPair);

    return displayedProjects;
};

const getPairWorkedMostTogether = (timeWorkedInPairs) => {
    return timeWorkedInPairs.map(pair => {
        const sortedWorkedWith = pair.workedWith.sort((a, b) => b.timeWorkedTogether - a.timeWorkedTogether);

        return {
            employeeId: pair.employeeId,
            otherEmployeeId: sortedWorkedWith[0].otherEmployeeId,
            daysWorkedTogether: sortedWorkedWith[0].timeWorkedTogether
        };
    });
}

const getProjectsToDisplay = (projects, resultPair) => {
    const projectsWorkedTogether = projects.filter(project =>
        project.employeesWorked.find(emp => emp.Employee_id === resultPair.employeeId) &&
        project.employeesWorked.find(emp => emp.Employee_id === resultPair.otherEmployeeId)
    );

    let displayedProjects = [];
    projectsWorkedTogether.forEach(project => {
        const daysWorkedTogetherOnProject = getTimeWorkedInPairsOnProject(project, resultPair.employeeId, resultPair.otherEmployeeId);

        if(daysWorkedTogetherOnProject !== 0) {
            // Since we are done with the data processing, preparing it in a human readable format
            displayedProjects.push({
                'Employee ID #1': resultPair.employeeId,
                'Employee ID #2': resultPair.otherEmployeeId,
                'Project ID': project.ProjectID,
                'Days worked': getTimeWorkedInPairsOnProject(project, resultPair.employeeId, resultPair.otherEmployeeId)
            });
        }
    });

    return displayedProjects;
}

const getTimeWorkedInPairsOnProject = (project, firstEmployee, secondEmployee) => {
    const firstEmployeeWork = project.employeesWorked.find(emp => emp.Employee_id === firstEmployee);
    const secondEmployeeWork = project.employeesWorked.find(emp => emp.Employee_id === secondEmployee);

    if(firstEmployeeWork && secondEmployeeWork) {
        const startDate = moment.max(moment(firstEmployeeWork.DateFrom), moment(secondEmployeeWork.DateFrom));
        const endDate = moment.min(moment(firstEmployeeWork.DateTo), moment(secondEmployeeWork.DateTo));

        if(startDate.isBefore(endDate)) {
            return endDate.diff(startDate, 'days') + 1; // +1 to include both start and end days
        }
    }
    return 0;
}

const getTimeWorkedInPairs = (uniqueEmployees, projects) => {
    let timeWorkedInPairs = [];

    uniqueEmployees.forEach(firstEmployeeId => {
        let workedWith = [];
        uniqueEmployees.forEach(secondEmployeeId => {
            if(firstEmployeeId === secondEmployeeId) {
                return; // Skip if it's the same employee
            }
            const timeWorkedTogether = getTimeWorkedTogether(firstEmployeeId, secondEmployeeId, projects);
            workedWith.push({
                otherEmployeeId: secondEmployeeId, 
                timeWorkedTogether: timeWorkedTogether
            });
        });
        timeWorkedInPairs.push({
            employeeId: firstEmployeeId,
            workedWith: workedWith
        });
    });

    return timeWorkedInPairs;
}

const getTimeWorkedTogether = (firstEmployee, secondEmployee, projects) => {
    let timeWorkedTogether = 0;

    projects.forEach(project => {
        const firstEmployeeWork = project.employeesWorked.find(emp => emp.Employee_id === firstEmployee);
        const secondEmployeeWork = project.employeesWorked.find(emp => emp.Employee_id === secondEmployee);

        if(firstEmployeeWork && secondEmployeeWork) {
            const startDate = moment.max(moment(firstEmployeeWork.DateFrom), moment(secondEmployeeWork.DateFrom));
            const endDate = moment.min(moment(firstEmployeeWork.DateTo), moment(secondEmployeeWork.DateTo));

            if(startDate.isBefore(endDate)) {
                timeWorkedTogether += endDate.diff(startDate, 'days') + 1;
            }
        }
    });

    return timeWorkedTogether;
}

const getRecordsFromCSVData = (csvHeaderCols, csvRows) => {
    let records = [];

    csvRows.forEach(row => {
        const cols = row.split(",");
        let record = {};
        
        for (let i = 0; i < cols.length; i++) {
            cols[i] = cols[i].trim();

            if(csvHeaderCols[i] === 'DateTo' && cols[i] === 'NULL') {
                // If DateTo is NULL, set it to today's date
                record[csvHeaderCols[i]] = moment().format("YYYY-MM-DD");
            } else if(csvHeaderCols[i] === 'DateTo' || csvHeaderCols[i] === 'DateFrom') {
                // Format DateTo and DateFrom to YYYY-MM-DD in order to support different date formats
                record[csvHeaderCols[i]] = moment(cols[i]).format("YYYY-MM-DD")
            } else {
                record[csvHeaderCols[i]] = cols[i];
            }
        }
        
        records.push(record);
    });

    return records;
}

const getProjectsFromRecords = (records) => {
    let projects = [];

    records.forEach(record => {
        const project = projects.find(project => project.ProjectID === record.ProjectID);
        if(project) {
            project.employeesWorked.push({
                Employee_id: record.EmpID,
                DateFrom: record.DateFrom,
                DateTo: record.DateTo,
                DaysWorked: moment(record.DateTo).diff(moment(record.DateFrom), 'days') + 1
            });
        } else {
            projects.push({
                ProjectID: record.ProjectID,
                employeesWorked: [{
                    Employee_id: record.EmpID,
                    DateFrom: record.DateFrom,
                    DateTo: record.DateTo,
                    DaysWorked: moment(record.DateTo).diff(moment(record.DateFrom), 'days') + 1
                }]
            });
        }
    });

    return projects;
}