import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getPairProjectsFromCsvFile } from "../utils";

import styles from "./Main.module.css";

export default function Main() {
    const [file, setFile] = useState();
    const [title, setTitle] = useState("Please upload and import a CSV file with employee data");
    const [displayedProjects, setDisplayedProjects] = useState([]);

    const fileReader = new FileReader();

    const handleOnChange = (e) => {
        setFile(e.target.files[0]);
    };

    // Could have also done it using a UseEffect hook watching for changes in the file state, but since it wasn't specified I went for a classic form submit handler
    const handleOnSubmit = (e) => {
        e.preventDefault();

        if(file && file.type === "text/csv") {
            fileReader.onload = function (event) {
                const csvOutputAsString = event.target.result;
                // Parsing the CSV file and getting the projects to display
                const projectsToDisplay = getPairProjectsFromCsvFile(csvOutputAsString);
                if(!projectsToDisplay.length) {
                    setDisplayedProjects([]);
                    setTitle("No pairs of employees found who have worked together");
                } else {
                    setDisplayedProjects(projectsToDisplay);
                }
            };

            fileReader.readAsText(file);
            setTitle("Pair of employees who have worked together");
        } else {
            setTitle("Please upload a valid CSV file");
        }
    };

    const showProjectsTable = () => {
        const headerKeys = Object.keys(Object.assign({}, ...displayedProjects));

        return (
            <div className={styles.ProjectsTable}>
                    <div className={styles.TableHeadRow}>
                        {headerKeys.map((key) => (
                            <div className={styles.TableHeadCol} key={uuidv4()}>{key}</div>
                        ))}
                    </div>
                    {displayedProjects.map((item) => (
                        <div key={uuidv4()} className={styles.TableDataRow}>
                            {Object.values(item).map((val) => (
                                <div className={styles.TableDataCol} key={uuidv4()}>{val}</div>
                            ))}
                        </div>
                    ))}
            </div>
        );
    }

    return (
        <div className={styles.MainContainer}>
            <h1 className={styles.Title}>{title}</h1>
            <form className={styles.CSVForm}>
                <input
                    type={"file"}
                    id={"csvFileInput"}
                    accept={".csv"}
                    onChange={handleOnChange}
                    className={styles.UploadButton}
                />

                <button className={styles.ImportButton} onClick={(e) => { handleOnSubmit(e);}}>
                    Import CSV file
                </button>
            </form>
            {displayedProjects.length ? showProjectsTable() : <></>}
        </div>
    );
}